package me.self.familytree.dao

import io.micronaut.test.annotation.MicronautTest
import me.self.familytree.beans.Gender
import me.self.familytree.beans.Person
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

@MicronautTest
class FamilyTreeDaoTest(private val familyTreeDao: FamilyTreeDao) {

    @Test
    fun testCreatePerson() {
        val name = "Axee Bces"
        val person = Person()
        person.addName(name)
        person.bioGender = Gender.Male
        val saved = familyTreeDao.upsertPerson(person)
        assertNotNull(saved?.id)
        assertTrue(saved?.names?.firstOrNull() == name)
        val another = Person()
        val anotherName = "Another Name"
        another.addName(anotherName)
        another.bioGender = Gender.Female
        person.bioMother = another
        person.addParent(another)
        person.id = saved?.id
        val updated = familyTreeDao.upsertPerson(person)
        assertNotNull(updated?.bioMother)
        assertTrue(updated?.bioMother?.names?.firstOrNull() == anotherName)
    }

}
