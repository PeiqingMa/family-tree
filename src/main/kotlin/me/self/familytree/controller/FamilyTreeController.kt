package me.self.familytree.controller

import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.*
import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Person
import me.self.familytree.beans.PersonView
import me.self.familytree.beans.RelationRequest
import me.self.familytree.service.FamilyTreeService
import me.self.familytree.utils.toView
import javax.inject.Inject

@Controller("/v1")
class FamilyTreeController(
        @Inject private val familyTreeService: FamilyTreeService
) {

    @Post("/person")
    fun addPerson(@Body inputPerson: Person): PersonView? {
        return familyTreeService.addPerson(inputPerson)?.toView()
    }

    @Put("/person/{id:[0-9]+}")
    fun updatePerson(@PathVariable id: Long, @Body inputPerson: Person): PersonView? {
        inputPerson.id = id
        return familyTreeService.addPerson(inputPerson)?.toView()
    }

    @Get("/person/{id:[0-9]+}")
    fun findPersonById(@PathVariable id: Long): PersonView? {
        return familyTreeService.findPerson(id)?.toView()
    }

    @Post("/relation")
    fun addRelation(@Body request: RelationRequest): HttpResponse<PersonView?> {
        if (request.relationType == FamilyRelations.Type.Spouse) {
            familyTreeService.addSpouse(request.currentId, request.anotherId, request.spouseFrom, request.spouseEnd)
        } else {
            if (request.parentType == null || request.childType == null) {
                return HttpResponse.badRequest()
            }
            familyTreeService.addRelation(request)
        }
        val updated = familyTreeService.findPerson(request.currentId)
        return if (updated == null) HttpResponse.badRequest() else HttpResponse.ok(updated.toView())
    }

    @Put("/relation/delete")
    fun removeRelation(@Body request: RelationRequest): HttpResponse<PersonView?> {
        familyTreeService.removeRelation(request.currentId, request.anotherId, request.relationType)
        val updated = familyTreeService.findPerson(request.currentId)
        return if (updated == null) HttpResponse.badRequest() else HttpResponse.ok(updated.toView())
    }

}
