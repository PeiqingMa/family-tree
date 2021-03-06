package me.self.familytree.controller

import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.*
import me.self.familytree.beans.*
import me.self.familytree.service.FamilyTreeService
import me.self.familytree.utils.toView
import me.self.familytree.utils.toViewList
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

    @Get("/persons")
    fun listPersons(@QueryValue("id") id: Long?): List<PersonView> {
        val result = familyTreeService.listPersons(id)
        return result?.toViewList() ?: listOf()
    }

    @Post("/person/relation")
    fun addPersonAsRelationOf(@Body inputPerson: PersonWithRelationRequest): PersonView? {
        return familyTreeService.addPersonAsRelationOf(inputPerson)?.toView()
    }

    @Post("/relation")
    fun addRelation(@Body request: RelationRequest): HttpResponse<PersonView?> {
        if (request.relationType != FamilyRelations.Type.Spouse &&
                (request.parentType == null || request.childType == null)) {
                return HttpResponse.badRequest()
        }
        familyTreeService.addRelation(request)
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
